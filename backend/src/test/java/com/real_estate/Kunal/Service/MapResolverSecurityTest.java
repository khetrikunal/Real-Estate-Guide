package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Repository.*;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.net.http.*;
import java.util.Map;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class MapResolverSecurityTest {
    private final HttpClient client = mock(HttpClient.class);
    private final LocationService service = new LocationService(mock(LocationRepository.class), mock(CustomCityRepository.class), mock(AreaRepository.class)) {
        @Override protected HttpClient httpClient() { return client; }
    };

    @Test
    void rejectsPrivateUrlsAndHostSpoofingEvenWithCoordinates() {
        for (String url : List.of("http://127.0.0.1/?q=18,73", "https://169.254.169.254/latest/meta-data/",
                "https://www.google.com.evil.test/?q=18,73", "https://www.google.com@127.0.0.1/",
                "https://www.google.com:8443/maps", "file:///etc/passwd")) {
            assertThatThrownBy(() -> service.resolveMapUrl(url)).isInstanceOf(IllegalArgumentException.class);
        }
        verifyNoInteractions(client);
    }

    @Test
    void resolvesTrustedCoordinatesWithoutNetwork() {
        var result = service.resolveMapUrl("https://www.google.com/maps?q=18.52,73.85");
        assertThat(result.getLatitude()).isEqualTo(18.52);
        assertThat(result.getLongitude()).isEqualTo(73.85);
        verifyNoInteractions(client);
    }

    @Test
    @SuppressWarnings("unchecked")
    void redirectToPrivateHostIsNeverFollowed() throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(302);
        when(response.headers()).thenReturn(HttpHeaders.of(Map.of("Location", List.of("http://127.0.0.1/admin")), (a,b) -> true));
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
        assertThatThrownBy(() -> service.resolveMapUrl("https://maps.app.goo.gl/example"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(client, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
}
