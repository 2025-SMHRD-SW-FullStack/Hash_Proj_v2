package com.ressol.ressol.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
public class HashUtil {
    public static String sha256Hex(String s){
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] d = md.digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e){ throw new RuntimeException(e); }
    }
}
