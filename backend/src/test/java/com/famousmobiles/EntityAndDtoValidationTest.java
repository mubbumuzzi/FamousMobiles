package com.famousmobiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import org.hibernate.annotations.BatchSize;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import com.famousmobiles.domain.Customer;
import com.famousmobiles.domain.enums.DeviceType;
import com.famousmobiles.domain.enums.PaymentMode;
import com.famousmobiles.dto.PaymentDto;
import com.famousmobiles.dto.TicketDto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

class EntityAndDtoValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void customer_phonesCollection_hasBatchSizeAnnotation() throws NoSuchFieldException {
        Field phonesField = Customer.class.getDeclaredField("phones");
        BatchSize batchSize = phonesField.getAnnotation(BatchSize.class);

        assertNotNull(batchSize, "Customer.phones MUST be annotated with @BatchSize to prevent N+1 queries");
        assertEquals(50, batchSize.size(), "BatchSize size must be 50");
    }

    @Test
    void paymentRequest_validPayload_hasZeroConstraintViolations() {
        PaymentDto.PaymentRequest req = new PaymentDto.PaymentRequest(
                new BigDecimal("500.00"),
                PaymentMode.UPI,
                "Valid notes"
        );

        Set<ConstraintViolation<PaymentDto.PaymentRequest>> violations = validator.validate(req);
        assertTrue(violations.isEmpty(), "Valid paymentRequest should produce 0 violations");
    }

    @Test
    void paymentRequest_nullOrNonPositiveAmount_producesValidationErrors() {
        // Null amount
        PaymentDto.PaymentRequest nullAmt = new PaymentDto.PaymentRequest(
                null,
                PaymentMode.CASH,
                null
        );
        Set<ConstraintViolation<PaymentDto.PaymentRequest>> nullViolations = validator.validate(nullAmt);
        assertFalse(nullViolations.isEmpty());
        assertTrue(nullViolations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("amount")));

        // Zero amount
        PaymentDto.PaymentRequest zeroAmt = new PaymentDto.PaymentRequest(
                BigDecimal.ZERO,
                PaymentMode.CASH,
                null
        );
        Set<ConstraintViolation<PaymentDto.PaymentRequest>> zeroViolations = validator.validate(zeroAmt);
        assertFalse(zeroViolations.isEmpty());

        // Negative amount
        PaymentDto.PaymentRequest negAmt = new PaymentDto.PaymentRequest(
                new BigDecimal("-100.00"),
                PaymentMode.CASH,
                null
        );
        Set<ConstraintViolation<PaymentDto.PaymentRequest>> negViolations = validator.validate(negAmt);
        assertFalse(negViolations.isEmpty());
    }

    @Test
    void paymentRequest_nullPaymentMode_producesValidationErrors() {
        PaymentDto.PaymentRequest nullMode = new PaymentDto.PaymentRequest(
                new BigDecimal("200.00"),
                null,
                null
        );
        Set<ConstraintViolation<PaymentDto.PaymentRequest>> violations = validator.validate(nullMode);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("paymentMode")));
    }

    @Test
    void ticketDto_createTicketRequest_constructorOverloadsDefaultCorrectly() {
        UUID customerId = UUID.randomUUID();
        TicketDto.CreateTicketRequest req12 = new TicketDto.CreateTicketRequest(
                customerId, DeviceType.MOBILE, "Apple", "iPhone 15", "Blue", "358999012345678",
                null, null, "Battery swollen", new BigDecimal("4500"), new BigDecimal("1000"), "2026-11-20"
        );

        assertEquals(0, req12.warrantyDays());
        assertEquals("Apple", req12.brand());
        assertEquals("iPhone 15", req12.model());
        assertEquals(new BigDecimal("4500"), req12.estimatedCost());
        assertEquals(new BigDecimal("1000"), req12.advancePaid());
    }
}
