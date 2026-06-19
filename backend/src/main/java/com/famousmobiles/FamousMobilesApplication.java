package com.famousmobiles;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.famousmobiles.config.AppProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class FamousMobilesApplication {

    public static void main(String[] args) {
        SpringApplication.run(FamousMobilesApplication.class, args);
    }
}
