import { getProjects, saveProjects } from './_db.js';
import { verifyAuth } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Public endpoint to fetch all projects or filter
  if (req.method === 'GET') {
    try {
      const projects = await getProjects();
      const { category, featured } = req.query || {};

      let filtered = [...projects];
      if (category && category !== 'All') {
        filtered = filtered.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
      }
      if (featured === 'true') {
        filtered = filtered.filter(p => p.featured === true);
      }

      return res.status(200).json({ success: true, count: filtered.length, projects: filtered });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Authenticate admin for all modifications
  const isAuthenticated = verifyAuth(req);
  if (!isAuthenticated) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin token required' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  // POST: Create a new project
  if (req.method === 'POST') {
    try {
      const { title, description, category, emoji, tools, githubUrl, demoUrl, accentColor, featured } = body;
      if (!title || !description) {
        return res.status(400).json({ success: false, error: 'Title and description are required' });
      }

      const projects = await getProjects();
      const newId = 'proj-' + Date.now().toString(36);
      const nextNumber = String(projects.length + 1).padStart(2, '0');

      const newProject = {
        id: newId,
        number: nextNumber,
        title: title.trim(),
        category: category || 'Excel',
        emoji: emoji || '📊',
        accentColor: accentColor || '#38bdf8',
        description: description.trim(),
        tools: Array.isArray(tools) ? tools : (tools ? tools.split(',').map(t => t.trim()) : ['Excel']),
        githubUrl: githubUrl || '',
        demoUrl: demoUrl || '',
        featured: featured !== undefined ? Boolean(featured) : true,
        createdAt: new Date().toISOString()
      };

      projects.unshift(newProject);
      projects.forEach((p, idx) => { p.number = String(idx + 1).padStart(2, '0'); });

      await saveProjects(projects);
      return res.status(201).json({ success: true, project: newProject });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // PUT: Update an existing project
  if (req.method === 'PUT') {
    try {
      const { id, title, description, category, emoji, tools, githubUrl, demoUrl, accentColor, featured } = body;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Project ID is required' });
      }

      let projects = await getProjects();
      const idx = projects.findIndex(p => p.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      projects[idx] = {
        ...projects[idx],
        title: title !== undefined ? title.trim() : projects[idx].title,
        description: description !== undefined ? description.trim() : projects[idx].description,
        category: category || projects[idx].category,
        emoji: emoji || projects[idx].emoji,
        accentColor: accentColor || projects[idx].accentColor,
        tools: Array.isArray(tools) ? tools : (tools ? tools.split(',').map(t => t.trim()) : projects[idx].tools),
        githubUrl: githubUrl !== undefined ? githubUrl : projects[idx].githubUrl,
        demoUrl: demoUrl !== undefined ? demoUrl : projects[idx].demoUrl,
        featured: featured !== undefined ? Boolean(featured) : projects[idx].featured,
        updatedAt: new Date().toISOString()
      };

      await saveProjects(projects);
      return res.status(200).json({ success: true, project: projects[idx] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // DELETE: Remove project
  if (req.method === 'DELETE') {
    try {
      const id = body.id || (req.query && req.query.id);
      if (!id) {
        return res.status(400).json({ success: false, error: 'Project ID is required' });
      }

      let projects = await getProjects();
      const filtered = projects.filter(p => p.id !== id);
      if (filtered.length === projects.length) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      filtered.forEach((p, idx) => { p.number = String(idx + 1).padStart(2, '0'); });
      await saveProjects(filtered);

      return res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
