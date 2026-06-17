-- Partnership pause support
alter table partnerships add column if not exists paused_until timestamptz;

-- Rematch queue fields on members
alter table members add column if not exists rematch_requested boolean not null default false;
alter table members add column if not exists carried_streak int not null default 0;
