package com.meonjeo.meonjeo.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class FileStorageConfig implements WebMvcConfigurer {

    @Value("${storage.local.base-dir:./uploads}")
    private String baseDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String loc = "file:" + java.nio.file.Path.of(baseDir).toAbsolutePath().normalize().toString() + "/";
        registry.addResourceHandler("/uploads/**").addResourceLocations(loc);
    }
}
