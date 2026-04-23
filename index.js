const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:xiaoqceo0227@db.eyfimwxykwgovidvhxgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('数据库连接失败:', err.stack);
  else console.log('数据库连接成功:', res.rows[0]);
});

const memoryData = {
  agents: [
    {
      id: 'agent-001',
      name: 'AI Assistant',
      memories: [
        { id: 'mem-001', content: '用户偏好简洁直接的沟通风格', type: 'semantic', importance: 9, created_at: '2026-04-09T10:00:00Z', context: { topic: 'communication', user_id: 'user-001' } },
        { id: 'mem-002', content: '项目 ClawStack 正在开发中，包含三个子产品', type: 'episodic', importance: 8, created_at: '2026-04-09T09:00:00Z', context: { topic: 'project', project: 'ClawStack' } }
      ]
    }
  ]
};

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/agents/:agentId/memories', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { type, limit = 10 } = req.query;
    const agent = memoryData.agents.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    let memories = agent.memories;
    if (type) memories = memories.filter(m => m.type === type);
    memories = memories.slice(0, parseInt(limit));
    res.json({ success: true, data: memories, total: memories.length, agent_id: agentId });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve memories' });
  }
});

app.post('/agents/:agentId/memories', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { content, type = 'semantic', importance = 5, context = {} } = req.body;
    if (!content) return res.status(400).json({ success: false, error: 'Content is required' });
    const agent = memoryData.agents.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    const newMemory = { id: `mem-${Date.now()}`, content, type, importance, created_at: new Date().toISOString(), context };
    agent.memories.unshift(newMemory);
    res.status(201).json({ success: true, data: newMemory, message: 'Memory added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add memory' });
  }
});

app.get('/agents/:agentId/search', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { q, type, min_importance = 0 } = req.query;
    const agent = memoryData.agents.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    let results = agent.memories;
    if (q) results = results.filter(m => m.content.toLowerCase().includes(q.toLowerCase()));
    if (type) results = results.filter(m => m.type === type);
    if (min_importance) results = results.filter(m => m.importance >= parseInt(min_importance));
    res.json({ success: true, data: results, total: results.length, query: { q, type, min_importance } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to search memories' });
  }
});

app.get('/agents/:agentId/stats', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = memoryData.agents.find(a => a.id === agentId);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    const stats = {
      total_memories: agent.memories.length,
      type_distribution: {
        semantic: agent.memories.filter(m => m.type === 'semantic').length,
        episodic: agent.memories.filter(m => m.type === 'episodic').length,
        procedural: agent.memories.filter(m => m.type === 'procedural').length
      },
      avg_importance: agent.memories.reduce((sum, m) => sum + m.importance, 0) / agent.memories.length,
      recent_memories: agent.memories.slice(0, 5)
    };
    res.json({ success: true, data: stats, agent_id: agentId });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', service: 'ClawMindOS', version: '1.0.0', timestamp: new Date().toISOString(), database: { connected: result.rowCount > 0 }, agents_count: memoryData.agents.length });
  } catch (error) {
    res.json({ status: 'ok', service: 'ClawMindOS', version: '1.0.0', timestamp: new Date().toISOString(), database: { connected: false, error: error.message } });
  }
});

app.get('/agents', (req, res) => {
  res.json({ success: true, data: memoryData.agents, total: memoryData.agents.length });
});

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🧠 ClawMindOS running on port ${PORT}`);
});

module.exports = app;
