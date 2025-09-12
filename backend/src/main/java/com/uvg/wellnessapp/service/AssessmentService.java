package com.uvg.wellnessapp.service;

import com.uvg.wellnessapp.domain.AssessmentResult;
import com.uvg.wellnessapp.repository.AssessmentResultRepository;
import com.uvg.wellnessapp.service.Gad7Service;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AssessmentService {

  private final AssessmentResultRepository repo;
  private final Gad7Service gad7;

  public AssessmentService(AssessmentResultRepository repo, Gad7Service gad7) {
    this.repo = repo;
    this.gad7 = gad7;
  }

  public AssessmentResult saveGad7(int[] answers, String notes, Long userId) {
    var r = gad7.score(answers);
    var ar = new AssessmentResult();
    ar.setAssessmentType("GAD7");
    ar.setTotal(r.total);
    ar.setCategory(r.category);
    ar.setNotes(notes);
    ar.setUserId(userId);
    return repo.save(ar);
  }

  public List<AssessmentResult> listAll() {
    return repo.findAllByOrderByCreatedAtDesc();
  }

  public List<AssessmentResult> listByUser(Long userId) {
    return repo.findByUserIdOrderByCreatedAtDesc(userId);

    

  }
  public AssessmentResult savePhq9(int[] answers, String notes, Long userId, Phq9Service phq9) {
    var r = phq9.score(answers);
    var ar = new AssessmentResult();
    ar.setAssessmentType("PHQ9");
    ar.setTotal(r.total);
    ar.setCategory(r.category);
    ar.setNotes(notes);
    ar.setUserId(userId);
    return repo.save(ar);
  }
}
