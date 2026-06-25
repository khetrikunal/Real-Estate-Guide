package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.BrokerLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BrokerLocationRepository extends JpaRepository<BrokerLocation, Long> {

    List<BrokerLocation> findByBrokerId(Long brokerId);

    void deleteByBrokerId(Long brokerId);

}
