-- Add checkin_hour to members table (Phase 1)
-- This is the hour (0-23) in the member's timezone when their check-in window opens.

alter table members add column if not exists checkin_hour int not null default 21 check (checkin_hour >= 0 and checkin_hour <= 23);
