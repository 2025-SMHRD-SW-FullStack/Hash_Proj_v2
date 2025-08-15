// src/main/java/com/ressol/ressol/proof/ProofService.java
package com.ressol.ressol.proof;

import com.ressol.ressol.application.MissionApplication;
import com.ressol.ressol.application.MissionApplicationRepository;
import com.ressol.ressol.common.HashUtil;
import com.ressol.ressol.exception.*;
import com.ressol.ressol.mission.Mission;
import com.ressol.ressol.mission.MissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class ProofService {
    private final MissionApplicationRepository appRepo;
    private final MissionRepository missionRepo;
    private final ProductOrderRegRepository orderRepo;
    private final ReceiptRepository receiptRepo;

    @Transactional
    public void registerOrderNumber(Long userId, Long applicationId, String orderNo){
        MissionApplication app = appRepo.findById(applicationId).orElseThrow(() -> new NotFoundException("application not found"));
        if (!app.getUserId().equals(userId)) throw new ForbiddenException("not yours");
        if (app.getStatus() != MissionApplication.Status.CONFIRMED) throw new BadRequestException("need confirmed");
        Mission m = missionRepo.findById(app.getMissionId()).orElseThrow(() -> new NotFoundException("mission not found"));
        if (m.getType() != Mission.Type.PRODUCT) throw new BadRequestException("not a PRODUCT mission");

        String norm = orderNo.replaceAll("[\\s-]", "").toLowerCase();
        String hash = HashUtil.sha256Hex(norm);
        if (orderRepo.findByApplicationId(app.getId()).isPresent()) throw new BadRequestException("already registered");
        ProductOrderReg reg = ProductOrderReg.builder()
                .applicationId(app.getId()).channelId(app.getChannelId())
                .orderNo(orderNo).orderNoHash(hash).build();
        orderRepo.save(reg);
    }

    @Transactional
    public void registerReceipt(Long userId, Long applicationId, String imageUrl, Integer amount, String ocrText){
        MissionApplication app = appRepo.findById(applicationId).orElseThrow(() -> new NotFoundException("application not found"));
        if (!app.getUserId().equals(userId)) throw new ForbiddenException("not yours");
        if (app.getStatus() != MissionApplication.Status.CONFIRMED) throw new BadRequestException("need confirmed");
        Mission m = missionRepo.findById(app.getMissionId()).orElseThrow(() -> new NotFoundException("mission not found"));
        if (m.getType() != Mission.Type.STORE) throw new BadRequestException("not a STORE mission");

        String hash = HashUtil.sha256Hex(imageUrl);
        if (receiptRepo.findByApplicationId(app.getId()).isPresent()) throw new BadRequestException("already registered");
        Receipt r = Receipt.builder()
                .applicationId(app.getId()).channelId(app.getChannelId())
                .imageUrl(imageUrl).amount(amount).ocrText(ocrText).receiptHash(hash).build();
        receiptRepo.save(r);
    }
}
