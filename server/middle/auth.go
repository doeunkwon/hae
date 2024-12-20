package middle

import (
	"net/http"
	"server/services"
	"strings"

	"github.com/labstack/echo/v4"
)

func FirebaseAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "No token provided"})
		}

		idToken := strings.Replace(authHeader, "Bearer ", "", 1)
		token, err := services.FirebaseAuth.VerifyIDToken(c.Request().Context(), idToken)
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid token"})
		}

		// Add both the user ID and token to the context
		c.Set("uid", token.UID)
		c.Set("token", idToken)
		return next(c)
	}
}
