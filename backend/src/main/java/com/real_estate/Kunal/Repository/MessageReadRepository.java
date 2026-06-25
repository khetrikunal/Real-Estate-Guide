package com.real_estate.Kunal.Repository;

import com.real_estate.Kunal.Entity.MessageRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MessageReadRepository
        extends JpaRepository<MessageRead, MessageRead.MessageReadId> {

    List<MessageRead> findByMessageId(UUID messageId);
}
