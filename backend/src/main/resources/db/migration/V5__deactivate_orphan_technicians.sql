-- Demo technicians without a staff login should not appear in the roster
UPDATE technicians SET active = false WHERE user_id IS NULL AND active = true;
