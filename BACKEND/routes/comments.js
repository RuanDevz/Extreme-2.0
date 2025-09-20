const express = require('express');
const router = express.Router();
const { Comment, User, CommentLike } = require('../models');
const { createNotification } = require('./notifications');
const authMiddleware = require('../Middleware/Auth');
const { Op } = require('sequelize');

// Listar comentários
router.get('/', async (req, res) => {
  try {
    const {
      contentId,
      modelId,
      page = 1,
      limit = 50,
      sortBy = 'recent'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { isActive: true };
    let order = [];

    // Filtros
    if (contentId) {
      where.contentId = contentId;
    }

    if (modelId) {
      where.modelId = modelId;
    }

    // Ordenação
    switch (sortBy) {
      case 'popular':
        order = [['likes', 'DESC'], ['createdAt', 'DESC']];
        break;
      case 'oldest':
        order = [['createdAt', 'ASC']];
        break;
      case 'recent':
      default:
        order = [['createdAt', 'DESC']];
        break;
    }

    const userId = req.headers.authorization ? req.user?.id : null;

    const { count, rows } = await Comment.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'isPremium', 'isAdmin', 'profilePhoto']
        },
        {
          model: Comment,
          as: 'replies',
          where: { isActive: true },
          required: false,
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'isPremium', 'isAdmin', 'profilePhoto']
          }]
        }
      ]
    });

    // Verificar se o usuário curtiu cada comentário
    let commentsWithLikes = rows;
    if (userId) {
      const commentIds = rows.map(comment => comment.id);
      const userLikes = await CommentLike.findAll({
        where: {
          userId,
          commentId: { [Op.in]: commentIds }
        }
      });

      const likedCommentIds = new Set(userLikes.map(like => like.commentId));
      
      commentsWithLikes = rows.map(comment => ({
        ...comment.toJSON(),
        isLiked: likedCommentIds.has(comment.id)
      }));
    } else {
      commentsWithLikes = rows.map(comment => ({
        ...comment.toJSON(),
        isLiked: false
      }));
    }

    res.json({
      comments: commentsWithLikes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ error: 'Erro ao buscar comentários', details: error.message });
  }
});

// Criar comentário
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { contentId, modelId, text, parentId } = req.body;
    const userId = req.user.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Texto do comentário é obrigatório' });
    }

    if (!contentId && !modelId) {
      return res.status(400).json({ error: 'É necessário fornecer contentId ou modelId' });
    }

    // Se for um reply (parentId existe), não duplicar o contentId/modelId
    const commentData = {
      userId,
      text: text.trim(),
      parentId
    };

    // Apenas adicionar contentId/modelId se não for um reply
    if (!parentId) {
      commentData.contentId = contentId;
      commentData.modelId = modelId;
    } else {
      // Para replies, buscar o comentário pai para herdar contentId/modelId
      const parentComment = await Comment.findByPk(parentId);
      if (parentComment) {
        commentData.contentId = parentComment.contentId;
        commentData.modelId = parentComment.modelId;
      }
    }

    const comment = await Comment.create(commentData);

    const commentWithUser = await Comment.findByPk(comment.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'isPremium', 'isAdmin', 'profilePhoto']
      }]
    });

    res.status(201).json({
      message: 'Comentário criado com sucesso',
      comment: {
        ...commentWithUser.toJSON(),
        isLiked: false
      }
    });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ error: 'Erro ao criar comentário', details: error.message });
  }
});

// Atualizar comentário
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    // Verificar se o usuário é o autor ou admin
    if (comment.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    await comment.update({ text: text.trim() });

    const updatedComment = await Comment.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'isPremium', 'isAdmin']
      }]
    });

    res.json({
      message: 'Comentário atualizado com sucesso',
      comment: updatedComment
    });
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    res.status(500).json({ error: 'Erro ao atualizar comentário', details: error.message });
  }
});

// Deletar comentário
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    // Verificar se o usuário é o autor ou admin
    if (comment.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    await comment.update({ isActive: false });

    res.json({ message: 'Comentário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ error: 'Erro ao deletar comentário', details: error.message });
  }
});

// Curtir/descurtir comentário
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    const existingLike = await CommentLike.findOne({
      where: { userId, commentId: id }
    });

    if (existingLike) {
      // Remover curtida
      await existingLike.destroy();
      await comment.decrement('likes');
      
      res.json({
        message: 'Curtida removida',
        isLiked: false,
        likes: comment.likes - 1
      });
    } else {
      // Adicionar curtida
      await CommentLike.create({ userId, commentId: id });
      await comment.increment('likes');
      
      // Create notification for comment author (if not self-like)
      if (comment.userId !== userId) {
        const liker = await User.findByPk(userId);
        await createNotification(
          comment.userId,
          'comment_like',
          'Someone liked your comment',
          `${liker.name} liked your comment`,
          { commentId: id, likerId: userId }
        );
      }
      
      res.json({
        message: 'Commentary liked',
        isLiked: true,
        likes: comment.likes + 1
      });
    }
  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    res.status(500).json({ error: 'Erro ao curtir comentário', details: error.message });
  }
});

module.exports = router;