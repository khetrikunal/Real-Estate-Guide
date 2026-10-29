package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.HashSet;
import java.util.Objects;

/** A workspace is the branch below a Super Admin, normally headed by a Sub Admin. */
@Service
@RequiredArgsConstructor
public class ChatAccessPolicy {
    private final UserRepository users;

    public boolean canContact(User actor, User recipient) {
        if (actor == null || recipient == null || Objects.equals(actor.getId(), recipient.getId())) return false;
        if (actor.getRole() == Role.SUPER_ADMIN || recipient.getRole() == Role.SUPER_ADMIN) return true;
        Long branch = branchRoot(actor);
        return branch != null && branch.equals(branchRoot(recipient));
    }

    private Long branchRoot(User member) {
        var visited = new HashSet<Long>();
        while (member != null && member.getId() != null && visited.add(member.getId())) {
            if (member.getRole() == Role.SUB_ADMIN || member.getAddedBy() == null) return member.getId();
            User parent = users.findById(member.getAddedBy()).orElse(null);
            if (parent == null) return null;
            if (parent.getRole() == Role.SUPER_ADMIN) return member.getId();
            member = parent;
        }
        return null;
    }
}
