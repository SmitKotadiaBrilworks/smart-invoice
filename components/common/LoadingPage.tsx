import { Spin } from "antd";
import type { SpinSize } from "antd/es/spin";

interface LoadingPageProps {
  /**
   * Size of the Spin component
   * @default "large"
   */
  size?: SpinSize;
  /**
   * Additional className for the container div
   */
  className?: string;
  /**
   * Custom wrapper class for the container
   * @default "flex items-center justify-center min-h-screen"
   */
  wrapperClassName?: string;
  /**
   * Whether to use full screen height
   * @default true
   */
  fullScreen?: boolean;
}

export default function LoadingPage({
  size = "large",
  className,
  wrapperClassName,
  fullScreen = true,
}: LoadingPageProps) {
  const defaultWrapperClass = fullScreen
    ? "flex items-center justify-center w-full h-full"
    : "flex items-center justify-center";

  return (
    <div className={wrapperClassName || defaultWrapperClass}>
      <Spin size={size} className={className} />
    </div>
  );
}
