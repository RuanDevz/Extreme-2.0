// routes/content.js
const express = require('express');
const router = express.Router();
const { Content, Model, UserHistory } = require('../models');
const { Op } = require('sequelize');
const slugify = require('slugify');
const encryptionService = require('../utils/encryption');
async function generateContentSlug(contentTitle, modelName = null) {
  let baseSlug;

  if (modelName) {
    const modelSlug = slugify(modelName, { lower: true, strict: true });
    const titleSlug = slugify(contentTitle, { lower: true, strict: true });
    baseSlug = `${modelSlug}-${titleSlug}`;
  } else {
    baseSlug = slugify(contentTitle, { lower: true, strict: true });
  }

  let slug = baseSlug;
  let counter = 1;

  while (await Content.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
}

async function generateContentId() {
  const crypto = require('crypto');
  let content_id;
  let exists = true;

  while (exists) {
    content_id = `content_${crypto.randomBytes(8).toString('hex')}`;
    const existing = await Content.findOne({ where: { content_id } });
    exists = !!existing;
  }

  return content_id;
}

// Listar todos os conteúdos
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const sortBy = req.query.sortBy || 'recent';
    const search = req.query.search;

    const offset = (page - 1) * limit;
    const where = { isActive: true, status: 'active' };
    let order = [];

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { '$model.name$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    switch (sortBy) {
      case 'popular': order = [['views', 'DESC']]; break;
      case 'oldest': order = [['createdAt', 'ASC']]; break;
      default: order = [['createdAt', 'DESC']]; break;
    }

    const { count, rows } = await Content.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [{
        model: Model,
        as: 'model',
        attributes: ['id', 'model_id', 'name', 'slug', 'photoUrl'],
        required: false
      }]
    });

    res.json({
      contents: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    res.status(500).json({ error: 'Erro ao buscar conteúdos', details: error.message });
  }
});

// Listar conteúdos por modelo
router.get('/model/:model_id', async (req, res) => {
  try {
    const { model_id } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const sortBy = req.query.sortBy || 'recent';
    const type = req.query.type;
    const tags = req.query.tags;

    const model = await Model.findOne({ where: { model_id: model_id } });
    if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });

    const offset = (page - 1) * limit;
    const where = { model_id: model_id, isActive: true, status: 'active' };
    let order = [];

    if (type) where.type = type;
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      where.tags = { [Op.overlap]: tagArray };
    }

    switch (sortBy) {
      case 'popular': order = [['views', 'DESC']]; break;
      case 'oldest': order = [['createdAt', 'ASC']]; break;
      default: order = [['createdAt', 'DESC']]; break;
    }

    const { count, rows } = await Content.findAndCountAll({
      where, order, limit, offset,
      include: [{ 
        model: Model, 
        as: 'model', 
        attributes: ['id', 'model_id', 'name', 'slug', 'photoUrl'] 
      }]
    });

    res.json({
      contents: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    res.status(500).json({ error: 'Erro ao buscar conteúdos', details: error.message });
  }
});

// Criar novo conteúdo
router.post('/', async (req, res) => {
  try {
    const contentData = { ...req.body };

    let modelName = null;
    if (contentData.model_id) {
      const model = await Model.findOne({ where: { model_id: contentData.model_id } });
      if (!model) {
        return res.status(404).json({ error: 'Modelo não encontrado com o model_id fornecido' });
      }
      modelName = model.name;
    }

    contentData.content_id = await generateContentId();
    contentData.slug = await generateContentSlug(contentData.title, modelName);

    if (contentData.info) {
      const { images, videos, size } = contentData.info;
      const info = {};
      if (Number(images) > 0) info.images = parseInt(images);
      if (Number(videos) > 0) info.videos = parseInt(videos);
      if (Number(size) > 0)   info.size   = parseInt(size);
      contentData.info = Object.keys(info).length ? info : null;
    }

    const newContent = await Content.create(contentData);

    const encrypted = encryptionService.encrypt({
      message: 'success',
      id: newContent.id,
      content_id: newContent.content_id,
      model_id: newContent.model_id || null
    });

    return res.status(201).json({
      ...encrypted,
      slug: newContent.slug
    });

  } catch (error) {
    console.error('Erro ao criar conteúdo:', error);
    return res.status(500).json({ error: 'Erro ao criar conteúdo', details: error.message });
  }
});

// Buscar conteúdo por slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const content = await Content.findOne({
      where: { slug, isActive: true },
      include: [{ 
        model: Model, 
        as: 'model', 
        attributes: ['id', 'model_id', 'name', 'photoUrl', 'slug'] 
      }]
    });

    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });
    res.json(content);
  } catch (error) {
    console.error('Erro ao buscar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao buscar conteúdo', details: error.message });
  }
});

// Detalhes do conteúdo por id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

    const content = await Content.findOne({
      where: { id, isActive: true },
      include: [{
        model: Model,
        as: 'model',
        attributes: ['id','model_id','name','photoUrl','slug']
      }]
    });

    if (!content) return res.status(404).json({ error: 'conteúdo não encontrado' });
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: 'erro ao buscar conteúdo', details: err.message });
  }
});

// Registrar visualização
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, process.env.TOKEN_VERIFY_ACCESS);
        userId = decoded.id;
      } catch (err) {
        // Token inválido, mas continua sem userId
      }
    }

    const content = await Content.findByPk(parseInt(id));
    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    await content.increment('views');

    if (userId) {
      await UserHistory.create({
        userId,
        contentId: content.id,
        model_id: content.model_id,
        action: 'view'
      });
    }

    const updated = await Content.findByPk(parseInt(id), { attributes: ['views'] });
    res.json({ message: 'Visualização registrada', views: updated?.views ?? null });
  } catch (error) {
    console.error('Erro ao registrar visualização:', error);
    res.status(500).json({ error: 'Erro ao registrar visualização', details: error.message });
  }
});

// Compartilhar conteúdo
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, process.env.TOKEN_VERIFY_ACCESS);
        userId = decoded.id;
      } catch (err) {
        // Token inválido, mas continua sem userId
      }
    }

    const content = await Content.findByPk(parseInt(id), {
      include: [{ 
        model: Model, 
        as: 'model', 
        attributes: ['name', 'slug'] 
      }]
    });
    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    if (userId) {
      await UserHistory.create({
        userId,
        contentId: content.id,
        model_id: content.model_id,
        action: 'share',
        metadata: { platform }
      });
    }

    const shareUrl = `${process.env.FRONTEND_URL}/model/${content.model.slug}?content=${content.id}`;
    const shareText = `Confira ${content.title} - ${content.model.name}`;
    res.json({ shareUrl, shareText, platform });
  } catch (error) {
    console.error('Erro ao compartilhar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao compartilhar conteúdo', details: error.message });
  }
});

// Atualizar conteúdo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findByPk(parseInt(id));
    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    const updateData = { ...req.body };

    if (updateData.info) {
      const { images, videos, size } = updateData.info;
      const info = {};
      if (images > 0) info.images = parseInt(images);
      if (videos > 0) info.videos = parseInt(videos);
      if (size > 0) info.size = parseInt(size);
      updateData.info = Object.keys(info).length ? info : null;
    }

    await content.update(updateData);
    res.json(content);
  } catch (error) {
    console.error('Erro ao atualizar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao atualizar conteúdo', details: error.message });
  }
});

// Deletar conteúdo (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findByPk(parseInt(id));
    if (!content) return res.status(404).json({ error: 'Conteúdo não encontrado' });

    await content.update({ isActive: false });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar conteúdo:', error);
    res.status(500).json({ error: 'Erro ao deletar conteúdo', details: error.message });
  }
});

module.exports = router;
