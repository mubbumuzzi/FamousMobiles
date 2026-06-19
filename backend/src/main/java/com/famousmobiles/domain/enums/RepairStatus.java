package com.famousmobiles.domain.enums;

public enum RepairStatus {
    DEVICE_RECEIVED,
    UNDER_DIAGNOSIS,
    WAITING_FOR_APPROVAL,
    WAITING_FOR_PARTS,
    REPAIR_IN_PROGRESS,
    QUALITY_CHECK,
    READY_FOR_PICKUP,
    DELIVERED;

    public RepairStatus next() {
        RepairStatus[] values = values();
        int index = ordinal();
        if (index >= values.length - 1) {
            return this;
        }
        return values[index + 1];
    }

    public boolean canTransitionTo(RepairStatus target) {
        if (this == target) {
            return false;
        }
        if (this == DELIVERED) {
            return false;
        }
        return target.ordinal() == ordinal() + 1;
    }
}
