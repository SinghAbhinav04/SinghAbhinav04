/**
 * Everything the README shows that changes on its own: repo stats, the
 * contribution calendar, language mix and PyPI downloads.
 *
 * Every fetch is individually guarded — a rate limit or an outage degrades one
 * panel to its configured fallback instead of failing the build.
 */
import { execFileSync } from "node:child_process";
import { CONFIG } from "./config.mjs";

/** GitHub token from the Action env, or the local `gh` login as a convenience. */
function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const TOKEN = token();

async function gql(query, variables) {
  if (!TOKEN) throw new Error("no GitHub token available");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "macos-readme-builder",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`graphql ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

/** Runs `fn`, logging and swallowing any failure so the build still completes. */
async function safe(label, fallback, fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`  ! ${label}: ${err.message} — using fallback`);
    return fallback;
  }
}

const PROFILE_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      followers { totalCount }
      following { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
        totalCount
        nodes {
          name
          description
          stargazerCount
          forkCount
          pushedAt
          isArchived
          primaryLanguage { name color }
          languages(first: 8, orderBy: {field: SIZE, direction: DESC}) {
            edges { size node { name color } }
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`;

/** Pull the whole profile in one GraphQL round trip. */
async function github() {
  const data = await gql(PROFILE_QUERY, { login: CONFIG.github });
  const u = data.user;
  const repos = u.repositories.nodes.filter(Boolean);

  const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));
  const stars = repos.reduce((sum, r) => sum + r.stargazerCount, 0);
  const forks = repos.reduce((sum, r) => sum + r.forkCount, 0);

  // Language mix, weighted by bytes across every non-fork repo.
  const bytes = new Map();
  for (const repo of repos) {
    for (const edge of repo.languages?.edges ?? []) {
      bytes.set(edge.node.name, (bytes.get(edge.node.name) ?? 0) + edge.size);
    }
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;
  const languages = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, size]) => ({ name, pct: (size / total) * 100 }));

  const cc = u.contributionsCollection;
  const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);

  return {
    followers: u.followers.totalCount,
    following: u.following.totalCount,
    repoCount: u.repositories.totalCount,
    stars,
    forks,
    commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
    prs: cc.totalPullRequestContributions,
    issues: cc.totalIssueContributions,
    contributions: cc.contributionCalendar.totalContributions,
    weeks: cc.contributionCalendar.weeks.map((w) => w.contributionDays),
    streak: streaks(days),
    languages,
    repos,
    byName,
  };
}

/** Longest and current run of days with at least one contribution. */
function streaks(days) {
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  // The current streak ignores today when it is still empty — the day is young.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) current++;
    else if (i === days.length - 1) continue;
    else break;
  }
  return { best, current };
}

/** Total downloads for the PyPI package, last 180 days. */
async function pypi(pkg) {
  const res = await fetch(`https://pypistats.org/api/packages/${pkg}/overall?mirrors=false`, {
    headers: { "User-Agent": "macos-readme-builder" },
  });
  if (!res.ok) throw new Error(`pypistats ${res.status}`);
  const json = await res.json();
  const total = json.data.reduce((sum, row) => sum + row.downloads, 0);
  const last30 = json.data.slice(-30).reduce((sum, row) => sum + row.downloads, 0);
  return { total, last30 };
}

/** 12.4k / 5.2k / 940 — the way a UI would show it. */
export function compact(num) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`.replace(".0", "");
  if (num >= 1000) return `${(num / 1000).toFixed(num >= 10_000 ? 0 : 1)}k`.replace(".0", "");
  return String(num);
}

export async function collect() {
  console.log("fetching live data…");

  const gh = await safe("github", null, github);
  const pkg = CONFIG.pypiPackage ? await safe("pypi", null, () => pypi(CONFIG.pypiPackage)) : null;

  const live = {
    stars: gh ? String(gh.stars) : null,
    repos: gh ? String(gh.repoCount) : null,
    commits: gh ? compact(gh.commits) : null,
    followers: gh ? String(gh.followers) : null,
    pypiDownloads: pkg ? compact(pkg.total) : null,
  };

  if (gh) console.log(`  ${gh.repoCount} repos · ${gh.stars}★ · ${gh.contributions} contributions`);
  if (pkg) console.log(`  pypi ${CONFIG.pypiPackage}: ${compact(pkg.total)} downloads (${pkg.last30} in 30d)`);

  return { gh, pkg, live, generatedAt: new Date() };
}
