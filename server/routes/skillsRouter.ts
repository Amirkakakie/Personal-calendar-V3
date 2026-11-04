import { Router, Request, Response } from 'express';
import { db } from '../db.ts';

const router = Router();

// GET all skills for authenticated user
router.get('/', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const skills = db.getSkills(userId);
  res.json({ success: true, count: skills.length, data: skills });
});

// GET all badges for authenticated user
router.get('/badges', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const badges = db.getBadges(userId);
  res.json({ success: true, count: badges.length, data: badges });
});

// TRAIN skill / practice session (award XP)
router.post('/:id/train', (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { xpAmount = 50 } = req.body;
  const skills = db.getSkills(userId);
  const skill = skills.find(s => s.id === req.params.id);

  if (!skill) {
    return res.status(404).json({ success: false, error: 'Skill node not found' });
  }

  db.awardXp(Number(xpAmount), skill.id, userId);
  const updatedSkills = db.getSkills(userId);
  const updatedSkill = updatedSkills.find(s => s.id === req.params.id);
  const stats = db.getProductivityStats(userId);

  res.json({
    success: true,
    message: `Earned +${xpAmount} XP in ${skill.name}`,
    skill: updatedSkill,
    stats: {
      totalXp: stats.totalXp,
      userLevel: stats.userLevel,
      rpgTitle: stats.rpgTitle
    }
  });
});

export default router;
