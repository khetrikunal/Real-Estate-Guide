package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.CustomCity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomCityRepository extends JpaRepository<CustomCity, Long> {

    List<CustomCity> findByStateIgnoreCase(String state);

    Optional<CustomCity> findByStateIgnoreCaseAndCityIgnoreCase(String state, String city);

    Optional<CustomCity> findFirstByCityIgnoreCase(String city);

    boolean existsByStateIgnoreCaseAndCityIgnoreCase(String state, String city);

    List<CustomCity> findAllByOrderByStateAscCityAsc();

}
