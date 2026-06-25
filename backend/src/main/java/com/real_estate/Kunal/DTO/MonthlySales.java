package com.real_estate.Kunal.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MonthlySales {

    private int month;

    private double total;
}