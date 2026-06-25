package com.real_estate.Kunal.Controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import com.real_estate.Kunal.DTO.EmployeeRequest;
import com.real_estate.Kunal.Entity.Employee;
import com.real_estate.Kunal.Service.EmployeeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @PostMapping
    public Employee createEmployee(@Valid @RequestBody EmployeeRequest request){
        return employeeService.createEmployee(request);
    }

    @GetMapping
    public List<Employee> getEmployees(){
        return employeeService.getEmployees();
    }

    @PutMapping("/{id}")
    public Employee updateEmployee(@PathVariable Long id,
                                   @Valid @RequestBody EmployeeRequest request){
        return employeeService.updateEmployee(id,request);
    }

    @DeleteMapping("/{id}")
    public void deleteEmployee(@PathVariable Long id){
        employeeService.deleteEmployee(id);
    }

}
