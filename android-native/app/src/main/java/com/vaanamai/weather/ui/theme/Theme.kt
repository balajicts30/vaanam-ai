package com.vaanamai.weather.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val VaanamDarkColors = darkColorScheme(
    primary = SkyCyan,
    secondary = ConsensusIndigo,
    tertiary = RainTeal,
    background = VaanamBgDark,
    surface = VaanamCardDark,
    surfaceVariant = VaanamChipDark,
    outline = VaanamBorderDark,
    onPrimary = VaanamBgDark,
    onBackground = VaanamTextPrimaryDark,
    onSurface = VaanamTextPrimaryDark,
    onSurfaceVariant = VaanamTextSecondaryDark
)

private val VaanamLightColors = lightColorScheme(
    primary = SkyCyan,
    secondary = ConsensusIndigo,
    tertiary = RainTeal,
    background = VaanamBgLight,
    surface = VaanamCardLight,
    surfaceVariant = VaanamChipLight,
    outline = VaanamBorderLight,
    onPrimary = VaanamTextPrimaryLight,
    onBackground = VaanamTextPrimaryLight,
    onSurface = VaanamTextPrimaryLight,
    onSurfaceVariant = VaanamTextSecondaryLight
)

@Composable
fun VaanamTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) VaanamDarkColors else VaanamLightColors,
        typography = VaanamTypography,
        content = content
    )
}
