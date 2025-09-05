package com.meonjeo.meonjeo.cart;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByUserIdOrderByIdDesc(Long userId);
    Optional<CartItem> findByUserIdAndVariantId(Long userId, Long variantId);
    int deleteByUserId(Long userId);
    Optional<CartItem> findByIdAndUserId(Long id, Long userId);
    List<CartItem> findByUserIdAndIdInOrderByIdDesc(Long userId, List<Long> ids);
    int deleteByUserIdAndIdIn(Long userId, List<Long> ids);
}
