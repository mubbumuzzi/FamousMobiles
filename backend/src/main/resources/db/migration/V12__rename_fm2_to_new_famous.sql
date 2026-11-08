-- V12: Rename Store 2 (FM2) to New Famous
UPDATE stores
SET name = 'New Famous',
    display_name = 'New Famous'
WHERE code = 'FM2';
