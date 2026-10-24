import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, fonts, radii, spacing, typography } from "@/src/theme/tokens";

export interface FormFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export default function FormField({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  isPassword = false,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const shouldHideText = isPassword ? !passwordVisible : secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={colors.ink[400]}
          secureTextEntry={shouldHideText}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={() => setPasswordVisible((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            {passwordVisible ? (
              <EyeOff size={18} color={colors.ink[400]} />
            ) : (
              <Eye size={18} color={colors.ink[400]} />
            )}
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
    width: "100%",
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: typography.sizes.caption,
    color: colors.ink[700],
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: colors.primary[500],
    backgroundColor: colors.surface,
  },
  inputWrapperError: {
    borderColor: colors.danger.base,
    backgroundColor: colors.danger.light,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[900],
    height: "100%",
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
    padding: 2,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.danger.base,
    marginTop: 4,
  },
  hintText: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.tiny,
    color: colors.ink[500],
    marginTop: 4,
  },
});
