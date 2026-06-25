package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);
    Optional<Payment> findTopBySubAdminIdOrderByVerifiedAtDesc(Long subAdminId);
    List<Payment> findBySubAdminIdOrderByCreatedAtDesc(Long subAdminId);
}
