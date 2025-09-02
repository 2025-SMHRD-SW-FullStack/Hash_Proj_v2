package com.meonjeo.meonjeo.file;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.InputStream;
import java.net.URI;
import java.util.Locale;

@Slf4j
@Component
public class S3StorageClient implements StorageClient {

    private final String bucket;
    private final String region;
    private final String endpoint;
    private final boolean pathStyle;
    private final String publicBaseUrl;
    private final boolean aclPublicRead;
    private final S3Client s3;

    public S3StorageClient(
            @Value("${storage.s3.bucket}") String bucket,
            @Value("${storage.s3.region:kr-standard}") String region,
            @Value("${storage.s3.endpoint:}") String endpoint,
            @Value("${storage.s3.path-style:true}") boolean pathStyle,
            @Value("${storage.s3.public-base-url:}") String publicBaseUrl,
            @Value("${storage.s3.acl-public-read:false}") boolean aclPublicRead,
            @Value("${storage.s3.accessKey:}") String accessKey,
            @Value("${storage.s3.secretKey:}") String secretKey
    ) {
        this.bucket = bucket;
        this.region = region;
        this.endpoint = endpoint;
        this.pathStyle = pathStyle;
        this.publicBaseUrl = publicBaseUrl;
        this.aclPublicRead = aclPublicRead;

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(pathStyle)
                        .build());

        if (endpoint != null && !endpoint.isBlank()) {
            builder = builder.endpointOverride(URI.create(endpoint));
        }

        if (accessKey != null && !accessKey.isBlank()) {
            builder = builder.credentialsProvider(
                    StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)
                    )
            );
        } else {
            builder = builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        this.s3 = builder.build();
        log.info("[S3Storage] bucket={}, region={}, endpoint={}, pathStyle={}, publicBaseUrl={}, aclPublicRead={}",
                bucket, region, endpoint, pathStyle, publicBaseUrl, aclPublicRead);
    }

    @Override
    public String save(ImageType type, String key, InputStream data, long size) throws Exception {
        PutObjectRequest.Builder req = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key);

        // Content-Type 세팅 (ImageType에 없을 수 있으니 확장자로 추정)
        String ct = guessContentType(key);
        if (ct != null) req = req.contentType(ct);

        if (aclPublicRead) {
            req = req.acl(ObjectCannedACL.PUBLIC_READ);
        }

        s3.putObject(req.build(), RequestBody.fromInputStream(data, size));

        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            return rtrim(publicBaseUrl) + "/" + key;
        }
        if (endpoint != null && !endpoint.isBlank()) {
            if (pathStyle) {
                return rtrim(endpoint) + "/" + bucket + "/" + key;
            } else {
                URI e = URI.create(endpoint);
                String host = bucket + "." + e.getHost();
                String port = (e.getPort() == -1) ? "" : (":" + e.getPort());
                String base = e.getScheme() + "://" + host + port + (e.getPath() == null ? "" : e.getPath());
                return rtrim(base) + "/" + key;
            }
        }
        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
    }

    private static String rtrim(String s) {
        return s.replaceAll("/+$", "");
    }

    private static String guessContentType(String key) {
        String k = key.toLowerCase(Locale.ROOT);
        if (k.endsWith(".png")) return "image/png";
        if (k.endsWith(".jpg") || k.endsWith(".jpeg")) return "image/jpeg";
        if (k.endsWith(".gif")) return "image/gif";
        if (k.endsWith(".webp")) return "image/webp";
        return "application/octet-stream";
    }
}
