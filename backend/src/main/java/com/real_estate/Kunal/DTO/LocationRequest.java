package com.real_estate.Kunal.DTO;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LocationRequest {

    private String locationName;

    @NotBlank(message = "State is required")
    private String state;

    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "Area is required")
    private String area;

    @DecimalMin(value = "0.0", inclusive = false, message = "Pricing must be a valid positive number")
    private Double subscriptionRate;

    @DecimalMin(value = "0.0", inclusive = false, message = "Pricing must be a valid positive number")
    private Double pricing;

    public Double getEffectivePricing() {
        if (pricing != null && pricing > 0) {
            return pricing;
        }
        return subscriptionRate;
    }

    public void setPricing(Double pricing) {
        this.pricing = pricing;
        if (this.subscriptionRate == null) {
            this.subscriptionRate = pricing;
        }
    }

    public void setSubscriptionRate(Double subscriptionRate) {
        this.subscriptionRate = subscriptionRate;
        if (this.pricing == null) {
            this.pricing = subscriptionRate;
        }
    }
}
