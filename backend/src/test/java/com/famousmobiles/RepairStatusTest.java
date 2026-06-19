package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.famousmobiles.domain.enums.RepairStatus;

class RepairStatusTest {

    @Test
    void allowsSequentialTransition() {
        assertTrue(RepairStatus.DEVICE_RECEIVED.canTransitionTo(RepairStatus.UNDER_DIAGNOSIS));
        assertTrue(RepairStatus.UNDER_DIAGNOSIS.canTransitionTo(RepairStatus.WAITING_FOR_APPROVAL));
        assertFalse(RepairStatus.DEVICE_RECEIVED.canTransitionTo(RepairStatus.REPAIR_IN_PROGRESS));
        assertFalse(RepairStatus.DELIVERED.canTransitionTo(RepairStatus.READY_FOR_PICKUP));
    }
}
