package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findByProjectId(Long projectId);

    List<Sale> findByProjectIdAndConfigurationId(Long projectId, Long configurationId);

    List<Sale> findByProjectIdIn(List<Long> projectIds);

    long countByProjectIdAndConfigurationId(Long projectId, Long configurationId);

    long countByProjectIdIn(List<Long> projectIds);

    List<Sale> findBySoldByUserId(Long soldByUserId);

    List<Sale> findBySoldByUserIdIn(List<Long> soldByUserIds);

    long countBySoldByUserId(Long soldByUserId);

    long countBySoldByUserIdIn(List<Long> userIds);

    @Query("SELECT COALESCE(SUM(s.amount), 0.0) FROM Sale s")
    double sumAllAmounts();

    @Query("SELECT COALESCE(SUM(s.amount), 0.0) FROM Sale s WHERE s.soldByUserId = :soldByUserId")
    double sumBySoldByUserId(Long soldByUserId);

    @Query("SELECT COALESCE(SUM(s.amount), 0.0) FROM Sale s WHERE s.soldByUserId IN :userIds")
    double sumBySoldByUserIdIn(List<Long> userIds);

    @Query("SELECT COALESCE(SUM(s.amount), 0.0) FROM Sale s WHERE s.projectId IN :projectIds")
    double sumByProjectIdIn(List<Long> projectIds);

    @Query("""
        SELECT EXTRACT(MONTH FROM s.saleDate), SUM(s.amount)
        FROM Sale s
        GROUP BY EXTRACT(MONTH FROM s.saleDate)
    """)
    List<Object[]> getMonthlySales();

}
