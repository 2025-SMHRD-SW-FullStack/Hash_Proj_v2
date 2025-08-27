package com.meonjeo.meonjeo.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

/**
 * 일관 JSON 에러 응답 + 안전한 서버 로그
 * - 4xx: warn, 5xx: error
 * - ResponseStatusException: 상태/메시지 그대로 전달
 * - 민감 정보는 클라이언트에 노출하지 않음
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 공통 응답 포맷
    public record ErrorRes(Instant timestamp, int status, String error, String message, String path, Map<String, Object> details) {}

    private ResponseEntity<ErrorRes> res(HttpStatus s, String msg, HttpServletRequest req, Map<String, Object> details) {
        return ResponseEntity.status(s)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new ErrorRes(Instant.now(), s.value(), s.getReasonPhrase(), msg, req.getRequestURI(), details));
    }
    private ResponseEntity<ErrorRes> res(HttpStatus s, String msg, HttpServletRequest req) {
        return res(s, msg, req, null);
    }

    // ====== 기존 커스텀 예외(동일 시그니처 유지) ======
    @ExceptionHandler(EmailTokenException.class)
    public ResponseEntity<ErrorRes> emailToken(EmailTokenException ex, HttpServletRequest req) {
        log.warn("400 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }
    @ExceptionHandler(UserAlreadyVerifiedException.class)
    public ResponseEntity<ErrorRes> alreadyVerified(UserAlreadyVerifiedException ex, HttpServletRequest req) {
        log.warn("409 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.CONFLICT, ex.getMessage(), req);
    }
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorRes> userNotFound(UserNotFoundException ex, HttpServletRequest req) {
        log.warn("404 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }
    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ErrorRes> emailExists(EmailAlreadyExistsException ex, HttpServletRequest req) {
        log.warn("409 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.CONFLICT, ex.getMessage(), req);
    }
    @ExceptionHandler(SocialAccountExistsException.class)
    public ResponseEntity<ErrorRes> socialExists(SocialAccountExistsException ex, HttpServletRequest req) {
        log.warn("409 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.CONFLICT, ex.getMessage(), req);
    }
    @ExceptionHandler(PasswordMismatchException.class)
    public ResponseEntity<ErrorRes> pwMismatch(PasswordMismatchException ex, HttpServletRequest req) {
        log.warn("400 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    // ====== 이번 단계 공용 예외 ======
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorRes> bad(BadRequestException ex, HttpServletRequest req) {
        log.warn("400 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorRes> nf(NotFoundException ex, HttpServletRequest req) {
        log.warn("404 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorRes> fb(ForbiddenException ex, HttpServletRequest req) {
        log.warn("403 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.FORBIDDEN, ex.getMessage(), req);
    }
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorRes> cf(ConflictException ex, HttpServletRequest req) {
        log.warn("409 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    // ====== Spring 표준: 상태를 보존하여 전달 ======
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorRes> rse(ResponseStatusException ex, HttpServletRequest req) {
        HttpStatus status = (ex.getStatusCode() instanceof HttpStatus hs) ? hs : HttpStatus.valueOf(ex.getStatusCode().value());
        String reason = ex.getReason() != null ? ex.getReason() : status.getReasonPhrase();
        if (status.is4xxClientError()) {
            log.warn("RSE {} {} -> {}: {}", req.getMethod(), req.getRequestURI(), status.value(), reason);
        } else {
            log.error("RSE {} {} -> {}: {}", req.getMethod(), req.getRequestURI(), status.value(), reason, ex);
        }
        return res(status, reason, req);
    }

    // ====== Validation / 요청 파싱 ======
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorRes> manv(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, Object> details = new HashMap<>();
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        }
        details.put("fieldErrors", fieldErrors);
        log.warn("400 {} {} -> MethodArgumentNotValid ({} errors)", req.getMethod(), req.getRequestURI(), fieldErrors.size());
        return res(HttpStatus.BAD_REQUEST, "유효성 검증 실패", req, details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorRes> cve(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, Object> details = new HashMap<>();
        Map<String, String> violations = new LinkedHashMap<>();
        for (ConstraintViolation<?> v : ex.getConstraintViolations()) {
            violations.put(v.getPropertyPath().toString(), v.getMessage());
        }
        details.put("violations", violations);
        log.warn("400 {} {} -> ConstraintViolation ({} violations)", req.getMethod(), req.getRequestURI(), violations.size());
        return res(HttpStatus.BAD_REQUEST, "유효성 검증 실패", req, details);
    }

    @ExceptionHandler({ HttpMessageNotReadableException.class, MissingServletRequestParameterException.class })
    public ResponseEntity<ErrorRes> badRequestParse(Exception ex, HttpServletRequest req) {
        log.warn("400 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getClass().getSimpleName());
        // 상세 파싱 에러 메시지는 노출하지 않음
        return res(HttpStatus.BAD_REQUEST, "요청을 읽을 수 없습니다.", req);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorRes> illegalArg(IllegalArgumentException ex, HttpServletRequest req) {
        log.warn("400 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorRes> methodNotAllowed(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        log.warn("405 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        Map<String, Object> details = new HashMap<>();
        details.put("supported", ex.getSupportedHttpMethods());
        return res(HttpStatus.METHOD_NOT_ALLOWED, "허용되지 않은 HTTP 메서드입니다.", req, details);
    }

    // ====== 인증/인가 ======
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorRes> auth(AuthenticationException ex, HttpServletRequest req) {
        log.warn("401 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.", req);
    }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorRes> deny(AccessDeniedException ex, HttpServletRequest req) {
        log.warn("403 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
        return res(HttpStatus.FORBIDDEN, "접근 권한이 없습니다.", req);
    }

    // ====== 저장소/데이터 계층 ======
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorRes> dataAccess(DataAccessException ex, HttpServletRequest req) {
        log.error("503 {} {} -> DataAccessException: {}", req.getMethod(), req.getRequestURI(), ex.toString(), ex);
        return res(HttpStatus.SERVICE_UNAVAILABLE, "저장소 접근 중 오류가 발생했습니다.", req);
    }

    // ====== Fallback (최후) ======
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorRes> unhandled(Exception ex, HttpServletRequest req) {
        log.error("500 {} {} -> {}", req.getMethod(), req.getRequestURI(), ex.toString(), ex);
        return res(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.", req);
    }
}
