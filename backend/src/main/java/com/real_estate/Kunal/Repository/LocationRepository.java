package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LocationRepository extends JpaRepository<Location, Long> {

	boolean existsByStateIgnoreCaseAndCityIgnoreCase(String state, String city);

	Optional<Location> findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIsNull(String city, String state);

	Optional<Location> findByCityIgnoreCaseAndAreaIgnoreCase(String city, String area);

	Optional<Location> findByCityIgnoreCaseAndStateIgnoreCaseAndAreaIgnoreCase(String city, String state, String area);

	boolean existsByCityIgnoreCaseAndStateIgnoreCaseAndAreaIgnoreCase(String city, String state, String area);

	List<Location> findAllByOrderByStateAscCityAscAreaAsc();

	Optional<Location> findByCityIgnoreCaseAndAreaIsNull(String city);

	/** Returns all area-specific location entries for a given city (where area is not null). */
	List<Location> findByCityIgnoreCaseAndAreaIsNotNull(String city);

	/** True if the city has at least one area-specific entry configured. */
	boolean existsByCityIgnoreCaseAndAreaIsNotNull(String city);

}
