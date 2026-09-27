package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.CustomCityResponse;
import com.real_estate.Kunal.Entity.Area;
import com.real_estate.Kunal.Entity.CustomCity;
import com.real_estate.Kunal.Repository.AreaRepository;
import com.real_estate.Kunal.Repository.CustomCityRepository;
import com.real_estate.Kunal.Repository.LocationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationServiceTest {

    @Mock
    private LocationRepository locationRepository;

    @Mock
    private CustomCityRepository customCityRepository;

    @Mock
    private AreaRepository areaRepository;

    private LocationService locationService;

    @BeforeEach
    void setUp() {
        locationService = new LocationService(locationRepository, customCityRepository, areaRepository);
    }

    @Test
    void getLocationRate_returnsAreaRateWhenAreaIsProvidedAndConfigured() {
        Area area = Area.builder()
                .name("Kothrud")
                .city("Pune")
                .state("Maharashtra")
                .subscriptionRate(450.0)
                .build();

        when(areaRepository.findByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase("Kothrud", "Pune", "Maharashtra"))
                .thenReturn(Optional.of(area));

        Optional<Double> rate = locationService.getLocationRate("Pune", "Maharashtra", "Kothrud");

        assertThat(rate).isPresent().contains(450.0);
    }

    @Test
    void getLocationRate_fallsBackToCustomCityRateWhenAreaRateNotConfigured() {
        Area areaWithoutRate = Area.builder()
                .name("Hinjewadi")
                .city("Pune")
                .state("Maharashtra")
                .subscriptionRate(null)
                .build();
        CustomCity city = CustomCity.builder()
                .city("Pune")
                .state("Maharashtra")
                .subscriptionRate(300.0)
                .build();

        when(areaRepository.findByNameIgnoreCaseAndCityIgnoreCaseAndStateIgnoreCase("Hinjewadi", "Pune", "Maharashtra"))
                .thenReturn(Optional.of(areaWithoutRate));
        when(customCityRepository.findByStateIgnoreCaseAndCityIgnoreCase("Maharashtra", "Pune"))
                .thenReturn(Optional.of(city));

        Optional<Double> rate = locationService.getLocationRate("Pune", "Maharashtra", "Hinjewadi");

        assertThat(rate).isPresent().contains(300.0);
    }

    @Test
    void getLocationRate_returnsCityRateWhenNoAreaProvided() {
        CustomCity city = CustomCity.builder()
                .city("Mumbai")
                .state("Maharashtra")
                .subscriptionRate(500.0)
                .build();

        when(customCityRepository.findByStateIgnoreCaseAndCityIgnoreCase("Maharashtra", "Mumbai"))
                .thenReturn(Optional.of(city));

        Optional<Double> rate = locationService.getLocationRate("Mumbai", "Maharashtra", null);

        assertThat(rate).isPresent().contains(500.0);
    }

    @Test
    void toggleCustomCityActive_flipsActiveStatus() {
        CustomCity city = CustomCity.builder()
                .id(1L)
                .city("Pune")
                .state("Maharashtra")
                .active(true)
                .build();

        when(customCityRepository.findById(1L)).thenReturn(Optional.of(city));
        when(customCityRepository.save(any(CustomCity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CustomCityResponse response = locationService.toggleCustomCityActive(1L);

        assertThat(response.getActive()).isFalse();
        verify(customCityRepository).save(any(CustomCity.class));
    }
}
