import fs from 'fs';
import path from 'path';

const GITHUB_REPO = process.env.GITHUB_REPO || 'mohdazeem7500/Portfolio';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FILE_PATH = 'data/projects.json';

let memoryCache = null;

export async function getProjects() {
  if (GITHUB_TOKEN) {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Serverless-Portfolio'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        const projects = JSON.parse(content);
        memoryCache = projects;
        return projects;
      }
    } catch (err) {
      console.error('Error fetching from GitHub API:', err);
    }
  }

  if (memoryCache) return memoryCache;
  try {
    const localFile = path.join(process.cwd(), 'data', 'projects.json');
    if (fs.existsSync(localFile)) {
      const raw = fs.readFileSync(localFile, 'utf8');
      memoryCache = JSON.parse(raw);
      return memoryCache;
    }
  } catch (err) {
    console.error('Local read error:', err);
  }

  return [];
}

export async function saveProjects(projects) {
  memoryCache = projects;
  const content = JSON.stringify(projects, null, 2);

  if (GITHUB_TOKEN) {
    try {
      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Vercel-Serverless-Portfolio'
        }
      });

      let sha = undefined;
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }

      const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Vercel-Serverless-Portfolio'
        },
        body: JSON.stringify({
          message: 'Update dynamic projects data [skip ci]',
          content: Buffer.from(content).toString('base64'),
          sha: sha
        })
      });

      if (!putRes.ok) {
        const errData = await putRes.json();
        console.error('Failed to commit to GitHub:', errData);
      }
    } catch (err) {
      console.error('GitHub save error:', err);
    }
  }

  try {
    const localFile = path.join(process.cwd(), 'data', 'projects.json');
    fs.writeFileSync(localFile, content, 'utf8');
  } catch (_) {}

  return projects;
}
