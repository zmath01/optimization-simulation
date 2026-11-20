module pwm_tb;
    logic clk = 0;
    logic reset = 1;
    logic [3:0] duty = 0;
    logic out;
    pwm dut (.*);
    always #1 clk = !clk;

    initial begin
        @(negedge clk);
        if (out !== 1'b0) $fatal(1, "Reset must hold the output low");
        reset = 0;
        for (int value = 0; value < 16; value++) begin
            int count;
            count = 0;
            duty = 4'(value);
            repeat (16) begin
                @(negedge clk);
                if (out) count++;
            end
            if (count != value) $fatal(1, "Duty %0d produced %0d high samples", value, count);
        end
        $display("PASS: all 16 duty settings");
        $finish;
    end
endmodule
