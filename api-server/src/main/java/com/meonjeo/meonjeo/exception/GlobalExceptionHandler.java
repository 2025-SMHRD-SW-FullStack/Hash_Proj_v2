package com.meonjeo.meonjeo.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 공통 응답 포맷
    public record ErrorRes(Instant timestamp, int status, String error, String message, String path, Map<String, Object> details) {}
    private ResponseEntity<ErrorRes> res(HttpStatus s, String msg, HttpServletRequest req, Map<String, Object> details) {
        return ResponseEntity.status(s).contentType(MediaType.APPLICATION_JSON)
                .body(new ErrorRes(Instant.now(), s.value(), s.getReasonPhrase(), msg, req.getRequestURI(), details));
    }
    private ResponseEntity<ErrorRes> res(HttpStatus s, String msg, HttpServletRequest req) {
        return res(s, msg, req, null);
    }

    /* ====== 네가 쓰던 커스텀 인증/회원 예외 ====== */
    @ExceptionHandler(EmailTokenException.class)
    public ResponseEntity<ErrorRes> emailToken(EmailTokenException ex, HttpServletRequest req) {
        return res(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }
    @ExceptionHandler(UserAlreadyVerifiedException.class)
    public ResponseEntity<ErrorRes> alreadyVerified(UserAlreadyVerifiedException ex, HttpServletRequest req) {
        return res(HttpStatus.CONFLICT, ex.getMessage(), req);
    }
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorRes> userNotFound(UserNotFoundException ex, HttpServletRequest req) {
        return res(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }
    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ErrorRes> emailExists(EmailAlreadyExistsException ex, HttpServletRequest req) {
        return res(HttpStatus.CONFLICT, ex.getMessage(), req);
    }
    @ExceptionHandler(SocialAccountExistsException.class)
    public ResponseEntity<ErrorRes> socialExists(SocialAccountExistsException ex, HttpServletRequest req) {
        return res(HttpStatus.CONFLICT, ex.getMessage(), req);
    }
    @ExceptionHandler(PasswordMismatchException.class)
    public ResponseEntity<ErrorRes> pwMismatch(PasswordMismatchException ex, HttpServletRequest req) {
        return res(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    /* ====== 이번 단계에서 추가한 공용 예외 ====== */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorRes> bad(BadRequestException ex, HttpServletRequest req) {
        return res(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorRes> nf(NotFoundException ex, HttpServletRequest req) {
        return res(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorRes> fb(ForbiddenException ex, HttpServletRequest req) {
        return res(HttpStatus.FORBIDDEN, ex.getMessage(), req);
    }
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorRes> cf(ConflictException ex, HttpServletRequest req) {
        return res(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    /* ====== Validation / 요청 파싱 ====== */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorRes> manv(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, Object> details = new HashMap<>();
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) fieldErrors.put(fe.getField(), fe.getDefaultMessage());
        details.put("fieldErrors", fieldErrors);
        return res(HttpStatus.BAD_REQUEST, "유효성 검증 실패", req, details);
    }
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorRes> cve(ConstraintViolationException ex, HttpServletRequest req) {
        return res(HttpStatus.BAD_REQUEST, "유효성 검증 실패: " + ex.getMessage(), req);
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorRes> badRequestParse(Exception ex, HttpServletRequest req) {
        return res(HttpStatus.BAD_REQUEST, "요청을 읽을 수 없습니다: " + ex.getMessage(), req);
    }

    /* ====== 인증/인가 ====== */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorRes> auth(AuthenticationException ex, HttpServletRequest req) {
        return res(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.", req);
    }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorRes> deny(AccessDeniedException ex, HttpServletRequest req) {
        return res(HttpStatus.FORBIDDEN, "접근 권한이 없습니다.", req);
    }

    /* ====== Redis/DataAccess ====== */
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorRes> redis(DataAccessException ex, HttpServletRequest req) {
        ex.printStackTrace();
        return res(HttpStatus.SERVICE_UNAVAILABLE, "저장소 접근 중 오류가 발생했습니다.", req);
    }

    /* ====== Fallback ====== */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorRes> unhandled(Exception ex, HttpServletRequest req) {
        ex.printStackTrace();
        return res(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.", req);
    }
}
