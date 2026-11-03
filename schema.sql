-- ============================================================================
-- Chronos OS - PostgreSQL Production DDL Migration Script
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Enums
DO $$ BEGIN
    CREATE TYPE life_domain_type AS ENUM ('WORK_CAREER', 'ACADEMIC_STUDY', 'PERSONAL_GROWTH', 'HEALTH_HABITS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE eisenhower_quadrant AS ENUM ('Q1_URGENT_IMPORTANT', 'Q2_NOT_URGENT_IMPORTANT', 'Q3_URGENT_NOT_IMPORTANT', 'Q4_NEITHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE biological_energy_level AS ENUM ('HIGH_FOCUS', 'CREATIVE', 'LOW_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE timeframe_type AS ENUM ('YEARLY', 'QUARTERLY', 'MONTHLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE skill_tier AS ENUM ('NOVICE', 'APPRENTICE', 'PRACTITIONER', 'EXPERT', 'MASTER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    total_xp INT DEFAULT 0,
    level INT DEFAULT 1,
    rpg_title VARCHAR(100) DEFAULT 'Aspiring Strategist',
    streak_days INT DEFAULT 1,
    best_streak_days INT DEFAULT 1,
    focus_score INT DEFAULT 85,
    google_id VARCHAR(255) UNIQUE,
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_token_expiry TIMESTAMPTZ,
    google_calendar_id VARCHAR(255) DEFAULT 'primary',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Life Domains Table
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type life_domain_type NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color_hex VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'Target',
    weight_pct INT DEFAULT 25,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_domain UNIQUE (user_id, type)
);

-- 3. OKRs / Goals Table
CREATE TABLE IF NOT EXISTS goal_okrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
    category life_domain_type DEFAULT 'WORK_CAREER',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    timeframe timeframe_type DEFAULT 'QUARTERLY',
    target_date DATE NOT NULL,
    progress_percent INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Key Results Table
CREATE TABLE IF NOT EXISTS key_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goal_okrs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    current_value NUMERIC(10,2) DEFAULT 0,
    target_value NUMERIC(10,2) DEFAULT 100,
    unit VARCHAR(50) DEFAULT '%',
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES goal_okrs(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'blue',
    status task_status DEFAULT 'IN_PROGRESS',
    target_hours NUMERIC(8,2) DEFAULT 20.0,
    logged_hours NUMERIC(8,2) DEFAULT 0.0,
    hourly_valuation NUMERIC(8,2) DEFAULT 85.00,
    drive_folder_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Skills Table (RPG Skill Tree)
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    tier skill_tier DEFAULT 'NOVICE',
    icon VARCHAR(50) DEFAULT 'Zap',
    description TEXT,
    parent_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    required_xp INT DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. User Skills (XP and Mastery)
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    current_xp INT DEFAULT 0,
    level INT DEFAULT 1,
    mastery_pct INT DEFAULT 10,
    is_unlocked BOOLEAN DEFAULT TRUE,
    unlocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_skill UNIQUE (user_id, skill_id)
);

-- 8. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES goal_okrs(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category life_domain_type DEFAULT 'WORK_CAREER',
    priority priority_level DEFAULT 'MEDIUM',
    status task_status DEFAULT 'TODO',
    eisenhower eisenhower_quadrant DEFAULT 'Q2_NOT_URGENT_IMPORTANT',
    energy_level biological_energy_level DEFAULT 'HIGH_FOCUS',
    due_date DATE,
    due_time TIME,
    duration_minutes INT DEFAULT 45,
    google_calendar_event_id VARCHAR(255),
    google_tasks_id VARCHAR(255),
    synced_to_google BOOLEAN DEFAULT FALSE,
    calendar_overlay VARCHAR(50) DEFAULT 'work',
    xp_reward INT DEFAULT 50,
    linked_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    drive_doc_url TEXT,
    tags TEXT[] DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Subtasks Table
CREATE TABLE IF NOT EXISTS subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    estimated_minutes INT DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Time Logs & ROI Calculator
CREATE TABLE IF NOT EXISTS time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    duration_seconds INT NOT NULL,
    hourly_rate NUMERIC(8,2) DEFAULT 75.00,
    calculated_roi NUMERIC(10,2) NOT NULL,
    efficiency_rate INT DEFAULT 90,
    energy_reported VARCHAR(50) DEFAULT 'High',
    note TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. User Badges / Achievements
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    xp_bonus INT DEFAULT 100,
    unlocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- 12. Calendar Events (Multi-Calendar Overlays)
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    category VARCHAR(50) DEFAULT 'work',
    calendar_type VARCHAR(50) DEFAULT 'work',
    is_google_event BOOLEAN DEFAULT FALSE,
    google_event_id VARCHAR(255),
    html_link TEXT,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Production Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_schedule ON tasks(due_date, due_time);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_domain ON tasks(domain_id);
CREATE INDEX IF NOT EXISTS idx_tasks_skill ON tasks(linked_skill_id);

CREATE INDEX IF NOT EXISTS idx_calendar_user_time ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_task ON calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_google_id ON calendar_events(google_event_id);

CREATE INDEX IF NOT EXISTS idx_timelogs_user_start ON time_logs(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_timelogs_task ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_timelogs_project ON time_logs(project_id);

CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_keyresults_goal ON key_results(goal_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
