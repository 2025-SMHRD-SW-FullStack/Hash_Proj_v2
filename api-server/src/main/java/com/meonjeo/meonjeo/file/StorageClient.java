package com.meonjeo.meonjeo.file;

import java.io.InputStream;

public interface StorageClient {
    String save(ImageType type, String key, InputStream data, long size) throws Exception;
}
