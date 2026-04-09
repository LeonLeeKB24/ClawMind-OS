const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:xiaoqceo0227@db.eyfimwxykwgovidvhxgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

// 测试数据库连接
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('数据库连接失败:', err.stack);
  } else {
    console.log('数据库连接成功:', res.rows[0]);
  }
});

// 模拟的记忆数据结构
const memoryData = {
  agents: [
    {
      id: 'agent-001',
      name: 'AI Assistant',
      memories: [
        {
          id: 'mem-001',
          content: '用户偏好简洁直接的沟通风格',
          type: 'semantic',
          importance: 9,
          created_at: '2026-04-09T10:00:00Z',
          context: { topic: 'communication', user_id: 'user-001' }
        },
        {
          id: 'mem-002',
          content: '项目 ClawStack 正在开发中，包含三个子产品',
          type: 'episodic',
          importance: 8,
          created_at: '2026-04-09T09:00:00Z',
          context: { topic: 'project', project: 'ClawStack' }
        }
      ]
    }
  ]
};

// API 路由
// 获取Agent记忆
app.get('/agents/:agentId/memories', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { type, limit = 10 } = req.query;
    
    const agent = memoryData.agents.find(a => a.id === agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    let memories = agent.memories;
    
    if (type) {
      memories = memories.filter(m => m.type === type);
    }
    
    memories = memories.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: memories,
      total: memories.length,
      agent_id: agentId
    });
  } catch (error) {
    console.error('获取记忆失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve memories'
    });
  }
});

// 添加记忆
app.post('/agents/:agentId/memories', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { content, type = 'semantic', importance = 5, context = {} } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }
    
    const agent = memoryData.agents.find(a => a.id === agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    const newMemory = {
      id: `mem-${Date.now()}`,
      content,
      type,
      importance,
      created_at: new Date().toISOString(),
      context
    };
    
    agent.memories.unshift(newMemory);
    
    res.status(201).json({
      success: true,
      data: newMemory,
      message: 'Memory added successfully'
    });
  } catch (error) {
    console.error('添加记忆失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add memory'
    });
  }
});

// 搜索记忆
app.get('/agents/:agentId/search', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { q, type, min_importance = 0 } = req.query;
    
    const agent = memoryData.agents.find(a => a.id === agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    let results = agent.memories;
    
    if (q) {
      results = results.filter(memory => 
        memory.content.toLowerCase().includes(q.toLowerCase())
      );
    }
    
    if (type) {
      results = results.filter(memory => memory.type === type);
    }
    
    if (min_importance) {
      results = results.filter(memory => memory.importance >= parseInt(min_importance));
    }
    
    res.json({
      success: true,
      data: results,
      total: results.length,
      query: { q, type, min_importance }
    });
  } catch (error) {
    console.error('搜索记忆失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search memories'
    });
  }
});

// 获取记忆统计
app.get('/agents/:agentId/stats', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const agent = memoryData.agents.find(a => a.id === agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
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
    
    res.json({
      success: true,
      data: stats,
      agent_id: agentId
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats'
    });
  }
});

// 健康检查
app.get('/health', async (req, res) => {
  try {
    // 测试数据库连接
    const result = await pool.query('SELECT NOW()');
    const dbConnected = result.rowCount > 0;
    
    res.json({
      status: 'ok',
      service: 'ClawMindOS',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: { connected: dbConnected },
      agents_count: memoryData.agents.length,
      total_memories: memoryData.agents.reduce((sum, agent) => sum + agent.memories.length, 0)
    });
  } catch (error) {
    res.json({
      status: 'ok',
      service: 'ClawMindOS',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: { connected: false, error: error.message },
      agents_count: memoryData.agents.length,
      total_memories: memoryData.agents.reduce((sum, agent) => sum + agent.memories.length, 0)
    });
  }
});

// 获取所有Agent
app.get('/agents', (req, res) => {
  res.json({
    success: true,
    data: memoryData.agents,
    total: memoryData.agents.length
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🧠 COS - ClawMindOS API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Available endpoints: /agents, /agents/:id/memories, /agents/:id/search, /agents/:id/stats`);
});

module.exports = app;
