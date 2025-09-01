package com.meonjeo.meonjeo.websocket;

import java.security.Principal;

public class StompUserPrincipal implements Principal {
    private final Long id;
    public StompUserPrincipal(Long id) { this.id = id; }
    public Long getId() { return id; }
    @Override public String getName() { return String.valueOf(id); }
}
