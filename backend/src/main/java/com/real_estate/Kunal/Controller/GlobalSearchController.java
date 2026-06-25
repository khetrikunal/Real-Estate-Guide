package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.GlobalSearchResultDTO;
import com.real_estate.Kunal.Service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class GlobalSearchController {

    private final SearchController searchController;
    private final ChatService chatService;

    /**
     * Global search endpoint that delegates to ChatService for unified search.
     * Combines messages, conversations, and contacts from chat module.
     * 
     * GET /api/search?q=query
     */
    @GetMapping
    public ResponseEntity<GlobalSearchResultDTO> globalSearch(
            @RequestParam("q") String query,
            java.security.Principal principal) {
        return searchController.globalSearch(query, principal);
    }

    /**
     * Flutter-compatible alias retained for React migration parity.
     * GET /api/search/global?q=query
     */
    @GetMapping("/global")
    public ResponseEntity<GlobalSearchResultDTO> globalSearchAlias(
            @RequestParam("q") String query,
            java.security.Principal principal) {
        return globalSearch(query, principal);
    }
}
