package com.jsp.spring.backbencher.ems.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.jsp.spring.backbencher.ems.entity.PdfUpload;

@Repository
public interface PdfUploadRepository extends JpaRepository<PdfUpload, Long> {

    @Query(value = "SELECT * FROM pdf_uploads WHERE MATCH(file_name, extracted_text) AGAINST(:query IN BOOLEAN MODE)", nativeQuery = true)
    List<PdfUpload> fullTextSearch(@Param("query") String query);

    List<PdfUpload> findByReportedTrue();
}