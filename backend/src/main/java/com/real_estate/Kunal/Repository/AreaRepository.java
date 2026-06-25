package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AreaRepository extends JpaRepository<Area, Long> {

    List<Area> findByCityIgnoreCase(String city);

    List<Area> findByCityIgnoreCaseAndStateIgnoreCase(String city, String state);

    boolean existsByCityIgnoreCase(String city);

    boolean existsByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase(String name, String city, String state);
}
