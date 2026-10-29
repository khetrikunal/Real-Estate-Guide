package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Payment p where p.razorpayOrderId = :orderId")
    Optional<Payment> findByOrderIdForUpdate(@org.springframework.data.repository.query.Param("orderId") String orderId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Payment p where p.razorpayPaymentId = :paymentId")
    Optional<Payment> findByPaymentIdForUpdate(@org.springframework.data.repository.query.Param("paymentId") String paymentId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);
    Optional<Payment> findTopBySubAdminIdOrderByVerifiedAtDesc(Long subAdminId);
    List<Payment> findBySubAdminIdOrderByCreatedAtDesc(Long subAdminId);
}
