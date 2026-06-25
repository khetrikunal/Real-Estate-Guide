package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findAllByOrderByTimestampDesc();
    List<Activity> findByCityOrderByTimestampDesc(String city);
}
