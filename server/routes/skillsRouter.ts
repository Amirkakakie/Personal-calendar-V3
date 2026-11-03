import { Router, Request, Response } from 'express';
import { db } from '../db.ts';

const router = Router();

// GET all skills
router.get('/', (_req: Request, res: Response) => {
  const skills = db.getSkills();
  res.json({ success: true, count: skills.length, data: skills });
});

// GET all badges
router.get('/badges', (_req: Request, res: Response) => {
  const badges = db.getBadges();
  res.json({ success: true, count: badges.length, data: badges });
});

// TRAIN skill / practice session (award XP)
router.post('/:id/train', (req: Request, res: Response) => {
  const { xpAmount = 50 } = req.body;
  const skills = db.getSkills();
  const skill = skills.find(s => s.id === req.params.id);

  if (!skill) {
    return res.status(404).json({ success: false, error: 'Skill node not found' });
  }

  db.awardXp(Number(xpAmount), skill.id);
  const updatedSkills = db.getSkills();
  const updatedSkill = updatedSkills.find(s => s.id === req.params.id);
  const stats = db.getProductivityStats();

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
