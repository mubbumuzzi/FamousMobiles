package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.famousmobiles.domain.enums.RepairStatus;

class RepairStatusTest {

    @Test
    void allowsAnyTransitionExceptSameOrFromDelivered() {
        assertTrue(RepairStatus.DEVICE_RECEIVED.canTransitionTo(RepairStatus.UNDER_DIAGNOSIS));
        assertTrue(RepairStatus.DEVICE_RECEIVED.canTransitionTo(RepairStatus.REPAIR_IN_PROGRESS));
        assertTrue(RepairStatus.UNDER_DIAGNOSIS.canTransitionTo(RepairStatus.READY_FOR_PICKUP));
        assertTrue(RepairStatus.UNDER_DIAGNOSIS.canTransitionTo(RepairStatus.DELIVERED));
        assertFalse(RepairStatus.UNDER_DIAGNOSIS.canTransitionTo(RepairStatus.UNDER_DIAGNOSIS));
        assertFalse(RepairStatus.DELIVERED.canTransitionTo(RepairStatus.READY_FOR_PICKUP));
        assertFalse(RepairStatus.DELIVERED.canTransitionTo(RepairStatus.DEVICE_RECEIVED));
    }
}
