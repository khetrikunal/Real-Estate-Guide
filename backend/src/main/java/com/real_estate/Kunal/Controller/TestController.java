package com.real_estate.Kunal.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class TestController {

    @GetMapping({"/test", "/api/test"})
    public ResponseEntity<?> test(){
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "message", "Backend Running Successfully",
            "timestamp", System.currentTimeMillis()
        ));
    }

}
