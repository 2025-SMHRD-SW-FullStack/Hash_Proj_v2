package com.meonjeo.meonjeo.file;

import java.io.InputStream;

public interface StorageClient {
    /** 저장 후 퍼블릭 접근 가능한 절대 URL을 반환 */
    String save(ImageType type, String key, InputStream data, long size) throws Exception;
}
